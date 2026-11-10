document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const participantSections = new Map();

  function createParticipantItem(activity, email) {
    const participantItem = document.createElement("li");
    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.textContent = "🗑";
    removeButton.title = "Remover participante";
    removeButton.setAttribute("aria-label", `Remover ${email} de ${activity}`);
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Não foi possível remover o participante.");
        }

        participantItem.remove();
        const participantsSection = participantSections.get(activity);
        const participantsList = participantsSection.querySelector("ul");
        if (participantsList.children.length === 0) {
          participantsList.remove();
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "Nenhum participante inscrito.";
          participantsSection.appendChild(emptyMessage);
        }
      } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      } finally {
        removeButton.disabled = false;
      }
    });

    participantItem.append(participantEmail, removeButton);
    return participantItem;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "activity-participants";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participantes inscritos";
        participantsSection.appendChild(participantsHeading);

        if (details.participants.length > 0) {
          const participantsList = document.createElement("ul");
          details.participants.forEach((email) => {
            participantsList.appendChild(createParticipantItem(name, email));
          });
          participantsSection.appendChild(participantsList);
        } else {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "Nenhum participante inscrito.";
          participantsSection.appendChild(emptyMessage);
        }

        activityCard.appendChild(participantsSection);
        participantSections.set(name, participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        const participantsSection = participantSections.get(activity);
        if (participantsSection) {
          let participantsList = participantsSection.querySelector("ul");
          if (!participantsList) {
            participantsList = document.createElement("ul");
            participantsSection.querySelector(".participants-empty").remove();
            participantsSection.appendChild(participantsList);
          }

          participantsList.appendChild(createParticipantItem(activity, email));
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
